'use strict';

angular.module('bahmni.common.displaycontrol.drugOrdersSection')
    .directive('drugOrdersSection', ['TreatmentService', 'spinner', '$rootScope', 'treatmentConfig', '$q','clinicalAppConfigService',  function (treatmentService, spinner, $rootScope, treatmentConfig, $q, clinicalAppConfigService) {
        var controller = function ($scope) {
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var drugOrderAppConfig = clinicalAppConfigService.getDrugOrderConfig();

            $scope.toggle = true;
            $scope.toggleDisplay = function () {
                $scope.toggle = ! $scope.toggle
            };

            $scope.columnHeaders = {
                "drugName": "DRUG_DETAILS_DRUG_NAME",
                "dosage": "DRUG_DETAILS_DOSE_INFO",
                "route": "DRUG_DETAILS_ROUTE",
                "duration": "DRUG_DETAILS_DURATION",
                "frequency": "DRUG_DETAILS_FREQUENCY",
                "startDate": "DRUG_DETAILS_START_DATE",
                "stopDate": "DRUG_DETAILS_STOP_DATE",
                "stopReason": "DRUG_DETAILS_ORDER_REASON_CODED",
                "stopReasonNotes": "DRUG_DETAILS_ORDER_REASON_TEXT"
            };

            $scope.minDateStopped = DateUtil.getDateWithoutTime(DateUtil.now());
            $scope.scheduledDate = DateUtil.getDateWithoutTime(DateUtil.now());

            var initialiseColumns = function() {
                $scope.columns = $scope.config.columns;
                if(!$scope.columns){
                    $scope.columns = _.keys($scope.columnHeaders);
                }
            };

            var init = function () {
                initialiseColumns();
                if (_.isEmpty($scope.config.title) && _.isEmpty($scope.config.translationKey)){
                    $scope.config.title = "Drug Orders";
                }
                var getDrugOrders = treatmentService.getAllDrugOrdersFor($scope.patientUuid, $scope.config.includeConceptSet, $scope.config.excludeConceptSet, $scope.config.active);

                return $q.all([getDrugOrders, treatmentConfig]).then(function (results) {
                    var createDrugOrder = function (drugOrder) {
                        return Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, drugOrderAppConfig, results[1]);
                    };
                    $scope.drugOrders = sortOrders(results[0].map(createDrugOrder));
                    $scope.stoppedOrderReasons = results[1].stoppedOrderReasonConcepts;
                });
            };

            var sortOrders = function(drugOrders){
                var drugOrderUtil = Bahmni.Clinical.DrugOrder.Util;
                var sortedDrugOrders = [];
                sortedDrugOrders.push(drugOrderUtil.sortDrugOrders(drugOrders));
                return _.flatten(sortedDrugOrders).reverse();
            };

            var clearOtherDrugOrderActions = function(revisedDrugOrder) {
                $scope.drugOrders.forEach(function (drugOrder) {
                    if(drugOrder != revisedDrugOrder) {
                        drugOrder.isDiscontinuedAllowed = true;
                        drugOrder.isBeingEdited = false;
                    }
                });
            };

            $scope.$on("event:reviseDrugOrder", function (event, drugOrder) {
                clearOtherDrugOrderActions(drugOrder);
            });

            $scope.refill = function (drugOrder) {
                $rootScope.$broadcast("event:refillDrugOrder", drugOrder);
            };

            $scope.revise = function (drugOrder, drugOrders) {
                if (drugOrder.isEditAllowed) {
                    $rootScope.$broadcast("event:reviseDrugOrder", drugOrder, drugOrders);
                }
            };

            $scope.discontinue = function (drugOrder) {
                if (drugOrder.isDiscontinuedAllowed) {
                    $rootScope.$broadcast("event:discontinueDrugOrder", drugOrder);
                    $scope.updateFormConditions(drugOrder);
                }
            };

            $scope.undoDiscontinue = function (drugOrder) {
                $rootScope.$broadcast("event:undoDiscontinueDrugOrder", drugOrder);
            };

            $scope.updateFormConditions = function(drugOrder){
                var formCondition = Bahmni.ConceptSet.FormConditions.rules ? Bahmni.ConceptSet.FormConditions.rules["Medication Stop Reason"] : undefined ;
                if(formCondition){
                    if(drugOrder.orderReasonConcept) {
                        if (!formCondition(drugOrder, drugOrder.orderReasonConcept.name.name))
                            disableAndClearReasonText(drugOrder);
                    }
                    else
                        disableAndClearReasonText(drugOrder);
                }else{
                    drugOrder.orderReasonNotesEnabled = true;
                }
            };

            var disableAndClearReasonText = function(drugOrder){
                drugOrder.orderReasonText = null;
                drugOrder.orderReasonNotesEnabled = false;
            };


            spinner.forPromise(init());
        };
        return {
            restrict: 'E',
            controller: controller,
            scope: {
                config: "=",
                patientUuid: "="
            },
            templateUrl: "../common/displaycontrols/drugOrdersSection/views/drugOrdersSection.html"
        };
    }]);